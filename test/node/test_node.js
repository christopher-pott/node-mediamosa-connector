var chai = require('chai'),
    should = chai.should,
    expect = chai.expect,
    assert = chai.assert;

var MediaMosa = require("../../MediaMosa");

describe('MediaMosa Tests', function(){

    describe("Constructor", function() {
        it('should throw error if user is invalid',function(done){
            expect(function(){
                MediaMosa('host', '', 'password');
            }).to.throw('MediaMosa constructor missing or null parameters');
            done();
        });
        it('should throw error if password is invalid',function(done){
            expect(function(){
                MediaMosa('host', 'user', null);
            }).to.throw('MediaMosa constructor missing or null parameters');
            done();
        });
        it('should throw error if host is invalid',function(done){
            expect(function(){
                MediaMosa('', 'user', 'password');
            }).to.throw('MediaMosa constructor missing or null parameters');
            done();
        });
        it('should not throw error if parameters are valid',function(done){
            expect(function(){
                MediaMosa('host', 'user', 'password');
            }).not.to.throw(Error);
            done();
        });
        it('should create a MediaMosa object',function(done){
            var MeMo = new MediaMosa('host', 'user', 'password');
            expect(MeMo).to.be.an.instanceof(MediaMosa);
            done();
        });
    });
    describe("The rest of the module", function() {
        it('needs some test cases',function(done){
            /*TODO:*/
            done();
        });
    });
});

